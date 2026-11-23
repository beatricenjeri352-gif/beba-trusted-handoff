"use client"

import { useState, useTransition } from "react"
import { createDeliveryAction } from "@/lib/actions/delivery"
import { OrderTracking } from "@/components/ui/order-tracking"
import DeliveryLocationPickerLoader from "@/components/delivery-location-picker-loader"
import { ChevronRight, Package, MapPin, User, CheckCircle2 } from "lucide-react"

interface DeliveryFormState {
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
}

export function DeliveryWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<DeliveryFormState>({
    deliveryMethod: "within_town",
    parcelDescription: "",
    parcelSize: "",
    weightKg: "",
    pickupLocation: "",
    pickupLandmark: "",
    pickupLatitude: "",
    pickupLongitude: "",
    destinationLocation: "",
    destinationLandmark: "",
    destinationLatitude: "",
    destinationLongitude: "",
    receiverName: "",
    receiverPhone: "",
  })

  const steps = [
    { name: "Parcel details", timestamp: currentStep >= 1 ? "In progress" : "Pending", isCompleted: currentStep > 1 },
    { name: "Pickup location", timestamp: currentStep >= 2 ? "In progress" : "Pending", isCompleted: currentStep > 2 },
    { name: "Drop-off details", timestamp: currentStep >= 3 ? "In progress" : "Pending", isCompleted: currentStep > 3 },
  ]

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.parcelDescription || !formData.pickupLocation || !formData.destinationLocation) {
      alert("Please fill all required fields")
      return
    }

    if (!formData.pickupLatitude || !formData.pickupLongitude || !formData.destinationLatitude || !formData.destinationLongitude) {
      alert("Please select both pickup and drop-off locations from suggestions")
      return
    }

    startTransition(async () => {
      try {
        const result = await createDeliveryAction(formData)
        if (result.error) {
          alert(`Error: ${result.error}`)
          return
        }
        if (result.success && result.tracking) {
          setTrackingNumber(result.tracking)
          setIsComplete(true)
        }
      } catch (err) {
        console.error("Error creating delivery:", err)
        alert("Failed to create delivery. Please try again.")
      }
    })
  }

  if (isComplete) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Delivery Request Placed!</h2>
          <p className="mb-2 text-gray-600">Your delivery request has been successfully created.</p>
          <p className="mb-6 text-sm font-semibold text-emerald-700">Tracking: {trackingNumber}</p>

          <div className="mb-8 rounded-xl bg-emerald-50 p-4">
            <p className="text-sm font-medium text-gray-900">
              Your request has been placed successfully!
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Click below to find and assign a courier to your delivery.
            </p>
          </div>

          <button
            onClick={() => {
              setIsComplete(false)
              setCurrentStep(1)
              setFormData({
                deliveryMethod: "within_town",
                parcelDescription: "",
                parcelSize: "",
                weightKg: "",
                pickupLocation: "",
                pickupLandmark: "",
                pickupLatitude: "",
                pickupLongitude: "",
                destinationLocation: "",
                destinationLandmark: "",
                destinationLatitude: "",
                destinationLongitude: "",
                receiverName: "",
                receiverPhone: "",
              })
            }}
            className="mb-3 w-full rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            Find a Courier
          </button>
          <button
            onClick={() => {
              setIsComplete(false)
              setCurrentStep(1)
            }}
            className="w-full rounded-xl border border-slate-300 px-6 py-3 font-semibold text-gray-700 hover:bg-slate-50"
          >
            Create Another Delivery
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Tracker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <OrderTracking steps={steps} />
      </div>

      {/* Form Steps */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Parcel Details */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <Package className="h-6 w-6 text-emerald-700" />
                  <h2 className="text-xl font-bold">1. Parcel Details</h2>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Delivery method</label>
                <select
                  value={formData.deliveryMethod}
                  onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="within_town">Within town</option>
                  <option value="to_stage">To a stage</option>
                  <option value="intertown">Inter-town</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Parcel description *</label>
                <textarea
                  value={formData.parcelDescription}
                  onChange={(e) => setFormData({ ...formData, parcelDescription: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="What are you sending?"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Parcel size</label>
                  <select
                    value={formData.parcelSize}
                    onChange={(e) => setFormData({ ...formData, parcelSize: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    <option value="">Select size</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pickup Location */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-emerald-700" />
                  <h2 className="text-xl font-bold">2. Pickup Location</h2>
                </div>
              </div>

              <DeliveryLocationPickerLoader
                name="pickup"
                label="Pickup location"
                locationName={formData.pickupLocation}
                landmark={formData.pickupLandmark}
                onLocationChange={(location, latitude, longitude, landmark) =>
                  setFormData({
                    ...formData,
                    pickupLocation: location,
                    pickupLatitude: latitude,
                    pickupLongitude: longitude,
                    pickupLandmark: landmark,
                  })
                }
              />
            </div>
          )}

          {/* Step 3: Drop-off & Receiver */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <User className="h-6 w-6 text-emerald-700" />
                  <h2 className="text-xl font-bold">3. Drop-off Details</h2>
                </div>
              </div>

              <DeliveryLocationPickerLoader
                name="destination"
                label="Delivery destination"
                locationName={formData.destinationLocation}
                landmark={formData.destinationLandmark}
                onLocationChange={(location, latitude, longitude, landmark) =>
                  setFormData({
                    ...formData,
                    destinationLocation: location,
                    destinationLatitude: latitude,
                    destinationLongitude: longitude,
                    destinationLandmark: landmark,
                  })
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Receiver name</label>
                  <input
                    type="text"
                    value={formData.receiverName}
                    onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Receiver phone</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="0712 345 678"
                    value={formData.receiverPhone}
                    onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-gray-700 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Delivery"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
