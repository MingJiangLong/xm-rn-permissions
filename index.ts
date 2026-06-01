import { PermissionsAndroid, Platform } from "react-native";
import { Permission, PERMISSIONS, PermissionStatus, request, requestMultiple, RESULTS } from "react-native-permissions";
import { requestPermission as requestFirebasePermission, getMessaging, AuthorizationStatus } from '@react-native-firebase/messaging'
import { getApp } from '@react-native-firebase/app'
const IGNORED_PERMISSION = "ignored_permission"
type XM_PermissionStatus = PermissionStatus | typeof IGNORED_PERMISSION
export enum PermissionCode {
    Camera = "0",
    Application = "1",
    Contact = "2",
    SMS = "4",
    Location = "5",
    PhoneState = "6",
    CallLog = "7",
    Calendar = "12",
    Microphone = "13",
    FirebaseMessaging = "-1",
    UserTracking = "-2",
    Photo = "10",
    Finger = "3",
    PersonalInfo = "9",
    Wifi = "11",
}

const PermissionsInfo: Record<PermissionCode, Permission | undefined> = {
    [PermissionCode.Camera]: Platform.select({
        android: PERMISSIONS.ANDROID.CAMERA,
        ios: PERMISSIONS.IOS.CAMERA
    }),
    [PermissionCode.Application]: undefined,
    [PermissionCode.Contact]: Platform.select({
        android: undefined,
        ios: PERMISSIONS.IOS.CONTACTS
    }),
    [PermissionCode.SMS]: Platform.select({
        android: PERMISSIONS.ANDROID.READ_SMS,
        ios: undefined
    }),
    [PermissionCode.Location]: Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    }),
    [PermissionCode.PhoneState]: undefined,
    [PermissionCode.CallLog]: Platform.select({
        ios: undefined,
        android: PERMISSIONS.ANDROID.READ_CALL_LOG
    }),

    [PermissionCode.Calendar]: Platform.select({
        ios: PERMISSIONS.IOS.CALENDARS,
        android: PERMISSIONS.ANDROID.READ_CALENDAR
    }),
    [PermissionCode.Microphone]: Platform.select({
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
        ios: PERMISSIONS.IOS.MICROPHONE
    }),
    [PermissionCode.UserTracking]: Platform.select({
        ios: PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY,
        android: undefined
    }),
    [PermissionCode.Photo]: Platform.select({
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
        android: undefined
    }),
    [PermissionCode.FirebaseMessaging]: undefined,
    [PermissionCode.Finger]: undefined,
    [PermissionCode.PersonalInfo]: undefined,
    [PermissionCode.Wifi]: undefined,
}
class RequestPermissionStatusManager {
    private __status__: "requesting" | "idle" = "idle";

    get status() {
        return this.__status__;
    }

    update(nextStatus: "requesting" | "idle") {
        this.__status__ = nextStatus
    }
}
export const requestPermissionStatusManager = new RequestPermissionStatusManager();




export const requestPermission = async (permissionCode: PermissionCode): Promise<XM_PermissionStatus> => {
    try {
        requestPermissionStatusManager.update("requesting")
        const requestCode = PermissionsInfo[permissionCode];

        if (!requestCode) return IGNORED_PERMISSION;
        if (permissionCode == PermissionCode.FirebaseMessaging) {
            return requestFirebaseMessagingPermission();
        }

        const result = await request(requestCode);
        return result
    } finally {
        requestPermissionStatusManager.update("idle")
    }
}

export const requestMultiplePermissions = async (permissions: PermissionCode[]) => {
    try {
        requestPermissionStatusManager.update("requesting")

        const multiplePermissionStr = permissions
            .filter(permission =>
                permission != PermissionCode.FirebaseMessaging
            )
            .map(permissionCode => PermissionsInfo[permissionCode]).filter(Boolean);


        let firebaseResult: XM_PermissionStatus;

        if (permissions.includes(PermissionCode.FirebaseMessaging)) {
            firebaseResult = await requestFirebaseMessagingPermission();
        }
        const requestResultMap = await requestMultiple(multiplePermissionStr as Permission[]);


        return permissions.reduce((pre, permission) => {
            const permissionStr = PermissionsInfo[permission]
            if (permissionStr == undefined) return [
                ...pre,
                {
                    serviceCode: permission,
                    status: IGNORED_PERMISSION as XM_PermissionStatus
                }
            ]
            if (permission == PermissionCode.FirebaseMessaging) {
                return [
                    ...pre,
                    {
                        serviceCode: permission,
                        status: firebaseResult
                    }
                ]
            }

            const requestResultStatus = requestResultMap[permissionStr]
            return [...pre, {
                serviceCode: permission,
                status: requestResultStatus
            }]
        }, [] as { serviceCode: PermissionCode, status: XM_PermissionStatus }[])
    } finally {
        requestPermissionStatusManager.update("idle")
    }
}

const requestFirebaseMessagingPermission = async (): Promise<XM_PermissionStatus> => {
    if (Platform.OS === "ios") {
        const app = getApp();
        const messaging = getMessaging(app)
        const authStatus = await requestFirebasePermission(messaging);
        if (authStatus === AuthorizationStatus.AUTHORIZED ||
            authStatus === AuthorizationStatus.PROVISIONAL) {
            return RESULTS.GRANTED
        }
        return RESULTS.DENIED;
    }

    if (Platform.OS === "android" && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        return result != RESULTS.GRANTED ? RESULTS.DENIED : RESULTS.GRANTED;
    }

    if (Platform.OS === "android") {
        return Promise.resolve(RESULTS.GRANTED)
    }
    return Promise.resolve(RESULTS.UNAVAILABLE)
}







