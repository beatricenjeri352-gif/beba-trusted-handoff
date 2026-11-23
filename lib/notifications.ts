export function notificationMessage(eventType: string, status: string | null): string {
  switch (eventType) {
    case "created":
      return "Delivery request created. Choose a carrier.";
    case "status_changed":
      return status ? `Delivery status: ${status.replaceAll("_", " ")}.` : "Delivery status updated.";
    case "carrier_declined":
      return "The carrier declined this delivery. Review the request.";
    case "charge_proposed":
      return "A carrier proposed an additional charge. Review the request.";
    default:
      return "Delivery update. Review the request.";
  }
}
