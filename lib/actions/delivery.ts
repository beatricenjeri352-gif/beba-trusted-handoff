"use server"

import { revalidatePath } from "next/cache"
import { redirect as nextRedirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function normalizePhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "")
  if (digits.startsWith("254") && digits.length === 12) return digits
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`
  return null
}

export async function createDeliveryAction(formData: {
  deliveryMethod: string
  parcelDescription: string
  parcelSize: string
  weightKg: string
  pickupLocation: string
  pickupLandmark: string
  pickupLatitude: string
  pickupLongitude: string
  destinationLocation: string
  destinationLandmark: string
  destinationLatitude: string
  destinationLongitude: string
  receiverName: string
  receiverPhone: string
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) nextRedirect("/login")

  const weightValue = formData.weightKg.trim()
  const weightKg = weightValue ? Number(weightValue) : null

  if (!formData.parcelDescription || !formData.pickupLocation || !formData.destinationLocation) {
    return { error: "delivery-required" }
  }

  if (!formData.pickupLatitude || !formData.pickupLongitude || !formData.destinationLatitude || !formData.destinationLongitude) {
    return { error: "location-pin-required" }
  }

  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
    return { error: "invalid-weight" }
  }

  const normalizedReceiverPhone = formData.receiverPhone ? normalizePhone(formData.receiverPhone) : null
  if (formData.receiverPhone && !normalizedReceiverPhone) {
    return { error: "invalid-receiver-phone" }
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from("delivery_requests")
    .insert({
      tracking_number: "",
      sender_user_id: currentUser.id,
      delivery_method: formData.deliveryMethod,
      parcel_description: formData.parcelDescription,
      parcel_size: formData.parcelSize || null,
      weight_kg: weightKg,
      current_status: "draft",
    })
    .select("id, tracking_number")
    .single()

  if (deliveryError || !delivery) {
    console.error("Delivery insert failed", deliveryError)
    return { error: "delivery-save-failed", reason: deliveryError?.code }
  }

  const { error: stopsError } = await supabase.from("delivery_stops").insert([
    {
      delivery_request_id: delivery.id,
      stop_type: "pickup",
      sequence_number: 1,
      location_name: formData.pickupLocation,
      address: formData.pickupLocation,
      latitude: Number(formData.pickupLatitude),
      longitude: Number(formData.pickupLongitude),
      instructions: formData.pickupLandmark || null,
    },
    {
      delivery_request_id: delivery.id,
      stop_type: "destination",
      sequence_number: 1,
      location_name: formData.destinationLocation,
      address: formData.destinationLocation,
      latitude: Number(formData.destinationLatitude),
      longitude: Number(formData.destinationLongitude),
      instructions: formData.destinationLandmark || null,
      contact_name: formData.receiverName || null,
      contact_phone: normalizedReceiverPhone,
    },
  ])

  if (stopsError) {
    console.error("Delivery stops insert failed", stopsError)
    await supabase.from("delivery_requests").delete().eq("id", delivery.id)
    return { error: "delivery-save-failed", reason: stopsError.code }
  }

  revalidatePath("/deliveries")
  return { success: true, tracking: delivery.tracking_number }
}
