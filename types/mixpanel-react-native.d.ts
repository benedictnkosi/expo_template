declare module 'mixpanel-react-native' {
    export class Mixpanel {
        constructor(token: string, trackAutomaticEvents?: boolean);
        init(): Promise<void>;
        track(eventName: string, properties?: Record<string, any>): Promise<void>;
        identify(distinctId: string): Promise<void>;
        set(properties: Record<string, any>): Promise<void>;
        people: {
            set(properties: Record<string, any>): Promise<void>;
        };
    }
} 