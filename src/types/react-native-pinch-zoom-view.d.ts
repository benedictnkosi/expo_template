declare module 'react-native-pinch-zoom-view' {
    import { ComponentType } from 'react';
    import { ViewProps } from 'react-native';

    interface PinchZoomViewProps extends ViewProps { }

    const PinchZoomView: ComponentType<PinchZoomViewProps>;
    export default PinchZoomView;
} 