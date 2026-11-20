export { ApiError, clearStoredToken, getStoredToken } from "./api/http";
export type { AppUser } from "./api/http";
export {
  authenticate,
  completeMasterOnboarding,
  deleteMasterService,
  ensureMasterProfile,
  fetchMe,
  resetTestUser,
  saveMasterAvatar,
  saveMasterBookingRules,
  saveMasterHours,
  saveMasterPlace,
  saveMasterProfile,
  saveMasterService,
  setMasterOnboardingStep,
} from "./api/masterApi";
export {
  createCabinetBooking,
  createCabinetClient,
  createCabinetClientNote,
  deleteCabinetClientNote,
  fetchCabinetClient,
  fetchCabinetClients,
  fetchCabinetSessions,
  updateCabinetClientNote,
} from "./api/cabinetApi";
export {
  cancelBooking,
  createBooking,
  fetchClientBooking,
  fetchClientBookingByToken,
  fetchMyBookings,
  markBookingPaid,
  rescheduleBooking,
} from "./api/bookingApi";
export {
  fetchMaster,
  fetchServiceTypes,
  fetchSlots,
  resolveCity,
  searchCities,
  suggestAddresses,
} from "./api/catalogApi";
export type { AddressHit, CityHit, ServiceTypeDto } from "./api/catalogApi";
