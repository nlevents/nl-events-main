import BookingConfirmation from "./BookingConfirmation";

// Backward-compatible alias for older booking links. The checkout flow now
// uses /booking-confirmation, but any existing /booking-success link should
// show the same complete confirmation, reference, and print/download actions.
export default function BookingSuccess() {
  return <BookingConfirmation />;
}
