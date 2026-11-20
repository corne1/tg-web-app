import { Navigate, Route, Routes } from "react-router-dom";
import type { MasterProfile } from "../types";
import { HomeRedirect } from "./HomeRedirect";
import { BookingDetailScreen } from "../screens/BookingDetailScreen";
import { ClientAddressScreen } from "../screens/client/ClientAddressScreen";
import { ClientBookingDetailScreen } from "../screens/client/ClientBookingDetailScreen";
import { ClientBookingTokenScreen } from "../screens/client/ClientBookingTokenScreen";
import { ClientConfirmScreen } from "../screens/client/ClientConfirmScreen";
import { ClientDateTimeScreen } from "../screens/client/ClientDateTimeScreen";
import { ClientPlaceScreen } from "../screens/client/ClientPlaceScreen";
import { ClientPublicProfileScreen } from "../screens/client/ClientPublicProfileScreen";
import { ClientServicesScreen } from "../screens/client/ClientServicesScreen";
import { ClientSuccessScreen } from "../screens/client/ClientSuccessScreen";
import { ClientYourDataScreen } from "../screens/client/ClientYourDataScreen";
import { AboutAppScreen } from "../screens/AboutAppScreen";
import { BookingRulesScreen } from "../screens/BookingRulesScreen";
import { CabinetProfileScreen } from "../screens/CabinetProfileScreen";
import { EditPublicPageScreen } from "../screens/EditPublicPageScreen";
import { ProfileStubScreen } from "../screens/ProfileStubScreen";
import { PublicProfileScreen } from "../screens/PublicProfileScreen";
import { ClientCardScreen } from "../screens/ClientCardScreen";
import { CreateClientNoteScreen } from "../screens/CreateClientNoteScreen";
import { EditClientNoteScreen } from "../screens/EditClientNoteScreen";
import { ClientsScreen } from "../screens/ClientsScreen";
import { EmptyStateScreen } from "../screens/EmptyStateScreen";
import { MyBookingsScreen } from "../screens/MyBookingsScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { OnboardingSuccessScreen } from "../screens/OnboardingSuccessScreen";
import { WelcomeMasterScreen } from "../screens/WelcomeMasterScreen";
import { ScheduleScreen } from "../screens/ScheduleScreen";
import { HoursSettingsScreen } from "../screens/HoursSettingsScreen";
import { HoursStepScreen } from "../screens/HoursStepScreen";
import { PlaceSettingsScreen } from "../screens/PlaceSettingsScreen";
import { ServicesSettingsScreen } from "../screens/ServicesSettingsScreen";
import { NewBookingClientScreen } from "../screens/NewBookingClientScreen";
import { NewBookingConfirmScreen } from "../screens/NewBookingConfirmScreen";
import { NewBookingPlaceScreen } from "../screens/NewBookingPlaceScreen";
import { NewBookingServiceScreen } from "../screens/NewBookingServiceScreen";
import { CreateClientScreen } from "../screens/CreateClientScreen";
import { NewBookingTimeScreen } from "../screens/NewBookingTimeScreen";
import { PlaceStepScreen } from "../screens/PlaceStepScreen";
import { ServiceFormScreen } from "../screens/ServiceFormScreen";
import { ServicesStepScreen } from "../screens/ServicesStepScreen";

export function AppRoutes({
  startParam,
  profile,
}: {
  startParam: string | undefined;
  profile: MasterProfile | null;
}) {
  return (
    <Routes>
            <Route
              path="/"
              element={
                <HomeRedirect startParam={startParam} profile={profile} />
              }
            />
            <Route
              path="/onboarding/welcome"
              element={<WelcomeMasterScreen />}
            />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route
              path="/onboarding/services"
              element={<ServicesStepScreen />}
            />
            <Route
              path="/onboarding/services/new"
              element={<ServiceFormScreen mode="new" />}
            />
            <Route
              path="/onboarding/services/:serviceId/edit"
              element={<ServiceFormScreen mode="edit" />}
            />
            <Route
              path="/onboarding/services/:serviceId/duplicate"
              element={<ServiceFormScreen mode="duplicate" />}
            />
            <Route path="/onboarding/hours" element={<HoursStepScreen />} />
            <Route path="/onboarding/place" element={<PlaceStepScreen />} />
            <Route
              path="/onboarding/success"
              element={<OnboardingSuccessScreen />}
            />
            <Route path="/cabinet" element={<ScheduleScreen />} />
            <Route path="/cabinet/clients" element={<ClientsScreen />} />
            <Route
              path="/cabinet/clients/:clientId"
              element={<ClientCardScreen />}
            />
            <Route
              path="/cabinet/clients/:clientId/notes/new"
              element={<CreateClientNoteScreen />}
            />
            <Route
              path="/cabinet/clients/:clientId/notes/:noteId"
              element={<EditClientNoteScreen />}
            />
            <Route path="/cabinet/profile" element={<CabinetProfileScreen />} />
            <Route
              path="/cabinet/profile/public"
              element={<PublicProfileScreen />}
            />
            <Route
              path="/cabinet/profile/edit"
              element={<EditPublicPageScreen />}
            />
            <Route
              path="/cabinet/profile/services"
              element={<ServicesSettingsScreen />}
            />
            <Route
              path="/cabinet/profile/services/new"
              element={
                <ServiceFormScreen
                  mode="new"
                  listPath="/cabinet/profile/services"
                />
              }
            />
            <Route
              path="/cabinet/profile/services/:serviceId/edit"
              element={
                <ServiceFormScreen
                  mode="edit"
                  listPath="/cabinet/profile/services"
                />
              }
            />
            <Route
              path="/cabinet/profile/services/:serviceId/duplicate"
              element={
                <ServiceFormScreen
                  mode="duplicate"
                  listPath="/cabinet/profile/services"
                />
              }
            />
            <Route
              path="/cabinet/profile/hours"
              element={<HoursSettingsScreen />}
            />
            <Route
              path="/cabinet/profile/place"
              element={<PlaceSettingsScreen />}
            />
            <Route
              path="/cabinet/profile/rules"
              element={<BookingRulesScreen />}
            />
            <Route
              path="/cabinet/profile/about"
              element={<AboutAppScreen />}
            />
            <Route
              path="/cabinet/profile/:stubKey"
              element={<ProfileStubScreen />}
            />
            <Route path="/cabinet/empty" element={<EmptyStateScreen />} />
            <Route
              path="/cabinet/booking/new"
              element={<NewBookingClientScreen />}
            />
            <Route
              path="/cabinet/booking/new/service"
              element={<NewBookingServiceScreen />}
            />
            <Route
              path="/cabinet/booking/new/time"
              element={<NewBookingTimeScreen />}
            />
            <Route
              path="/cabinet/booking/new/place"
              element={<NewBookingPlaceScreen />}
            />
            <Route
              path="/cabinet/booking/new/confirm"
              element={<NewBookingConfirmScreen />}
            />
            <Route
              path="/cabinet/booking/new/client"
              element={<CreateClientScreen />}
            />
            <Route
              path="/cabinet/clients/new"
              element={<CreateClientScreen />}
            />
            <Route
              path="/cabinet/booking/:bookingId"
              element={<BookingDetailScreen />}
            />
            <Route path="/client/bookings" element={<MyBookingsScreen />} />
            <Route
              path="/client/bookings/t/:accessToken"
              element={<ClientBookingTokenScreen />}
            />
            <Route
              path="/client/bookings/:bookingId"
              element={<ClientBookingDetailScreen />}
            />
            <Route
              path="/client/:masterId/services"
              element={<ClientServicesScreen />}
            />
            <Route
              path="/client/:masterId/place"
              element={<ClientPlaceScreen />}
            />
            <Route
              path="/client/:masterId/address"
              element={<ClientAddressScreen />}
            />
            <Route
              path="/client/:masterId/time"
              element={<ClientDateTimeScreen />}
            />
            <Route
              path="/client/:masterId/data"
              element={<ClientYourDataScreen />}
            />
            <Route
              path="/client/:masterId/confirm"
              element={<ClientConfirmScreen />}
            />
            <Route
              path="/client/:masterId/success"
              element={<ClientSuccessScreen />}
            />
            <Route
              path="/client/:masterId"
              element={<ClientPublicProfileScreen />}
            />
            <Route
              path="/client"
              element={<Navigate to="/client/bookings" replace />}
            />
            <Route path="/notifications" element={<NotificationsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
