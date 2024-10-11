/* eslint-disable react-native/no-inline-styles */
import React, {
  forwardRef,
  ForwardRefRenderFunction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useZoomable } from '../hooks/useZoomable';
import type { ImageZoomProps, ImageZoomRef, ZoomableRef } from '../types';
import { clamp } from '../';

const styles = StyleSheet.create({
  image: {
    width: '100%',
  },
});

const Zoomable: ForwardRefRenderFunction<ImageZoomRef, ImageZoomProps> = (
  {
    uri = '',
    minScale,
    maxScale,
    scale,
    doubleTapScale,
    maxPanPointers,
    isPanEnabled,
    isPinchEnabled,
    isSingleTapEnabled,
    isDoubleTapEnabled,
    onInteractionStart,
    onInteractionEnd,
    onPinchStart,
    onPinchEnd,
    onPanStart,
    onPanEnd,
    onSingleTap,
    onDoubleTap,
    onProgrammaticZoom,
    onResetAnimationEnd,
    onLayout,
    style = {},
    pins,
    src,
    translateY,
    ...props
  },
  ref
) => {
  const pinsRef = React.useRef<View[] | null>([]);
  const imageRef = React.useRef<ZoomableRef>(null);
  const scaleRef = React.useRef<number>(1);

  const translateYSharedValue = useSharedValue(0);
  const scaleSharedValue = useSharedValue(1);

  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(1);

  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(1);

  const aspectRatio = useMemo(() => {
    return imageWidth / imageHeight;
  }, [imageHeight, imageWidth]);

  const onPinch = useCallback(
    (e) => {
      if (pins) {
        // pinsRef.current?.forEach((pin: any, index) => {
        //   if ((maxScale && e.scale * scaleRef.current < maxScale)){
        //     pin.setNativeProps({
        //       style: {
        // transform: [{ scale: 1/  (e.scale * scaleRef.current)}, { translateX: -11* e.scale * scaleRef.current }, { translateY: -11* e.scale * scaleRef.current }],
        //       },
        //     });
        //   }
        // });
        scaleSharedValue.value = clamp(
          e.scale * scaleRef.current,
          minScale ?? 1,
          maxScale ?? 1
        );
      }
    },
    [pinsRef.current, pins, imageRef.current, scaleRef.current]
  );

  const onPinchEndInternal = useCallback(
    (e) => {
      if (scaleRef.current * e.scale < (minScale ?? 1)) {
        scaleRef.current = minScale ?? 1;
      } else if (scaleRef.current * e.scale > (maxScale ?? 1)) {
        scaleRef.current = maxScale ?? 1;
      } else {
        scaleRef.current = scaleRef.current * e.scale;
      }
      onPinchEnd && onPinchEnd(e, true); // Assuming success is true, adjust
    },
    [onPinchEnd, scaleRef.current]
  );

  const { animatedStyle, gestures, onZoomableLayout } = useZoomable({
    minScale,
    maxScale,
    scale,
    doubleTapScale,
    maxPanPointers,
    isPanEnabled,
    isPinchEnabled,
    isSingleTapEnabled,
    isDoubleTapEnabled,
    onInteractionStart,
    onInteractionEnd,
    onPinchStart,
    onPinchEnd: onPinchEndInternal,
    onPanStart,
    onPanEnd,
    onSingleTap,
    onDoubleTap,
    onProgrammaticZoom,
    onResetAnimationEnd,
    onPinch,
    onLayout,
    ref: imageRef as React.MutableRefObject<ZoomableRef | null>,
  });

  useImperativeHandle(
    ref,
    () => ({
      zoom: ({ scale, x: xPercentage, y: yPercentage }) => {
        // Implement zoom functionality here
        scaleRef.current = clamp(
          scale * scaleRef.current,
          minScale ?? 1,
          maxScale ?? 1
        );
        imageRef.current?.zoom({
          scale: scaleRef.current * scale,
          x: (xPercentage / 100) * containerWidth,
          y: ((yPercentage / 100) * imageHeight * imageWidth) / containerWidth,
        });
        onPinch({ scale: scale });
      },
      zoomTo: ({ scale, x: xPercentage, y: yPercentage }) => {
        // Implement zoomTo functionality here
        scaleRef.current = clamp(scale, minScale ?? 1, maxScale ?? 1);
        imageRef.current?.zoom({
          scale: scale,
          x: (xPercentage / 100) * containerWidth,
          y:
            (yPercentage > 50
              ? yPercentage / 100 + 1 / 2
              : yPercentage / 100 - 1 / 2) * containerHeight,
        });
        onPinch({ scale: scale / scaleRef.current });
      },
      reset: () => {
        // Implement reset functionality here
        imageRef.current?.reset();
        onPinch({ scale: 1 / scaleRef.current });
      },
    }),
    [
      scaleRef.current,
      maxScale,
      minScale,
      imageWidth,
      imageHeight,
      containerWidth,
      containerHeight,
    ]
  );

  // translateYSharedValue.value = translateY > 50 ? translateY : 0;

  useEffect(() => {
    translateYSharedValue.value = translateY > 50 ? translateY : 0;
  }, [translateY]);

  const animatedStylesContainer = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(
          ((-translateYSharedValue.value / 100) * imageWidth * containerWidth) /
            containerHeight
        ),
      },
    ],
  }));

  const animatedStyleScale = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(1 / scaleSharedValue.value) },
      { translateX: withTiming(-11 * scaleSharedValue.value) },
      { translateY: withSpring(-11 * scaleSharedValue.value) },
    ],
  }));

  return (
    <Animated.View
      style={[{ flex: 1, justifyContent: 'center' }, animatedStylesContainer]}
    >
      <GestureDetector gesture={gestures}>
        <Animated.View
          ref={imageRef as React.RefObject<any>}
          style={[
            { position: 'relative', backgroundColor: 'orange' },
            animatedStyle,
          ]}
        >
          <Animated.Image
            style={[styles.image, style, { aspectRatio }]}
            source={{ uri }}
            resizeMode="contain"
            onLayout={(event) => {
              onZoomableLayout(event);
              setContainerWidth(event.nativeEvent.layout.width);
              setContainerHeight(event.nativeEvent.layout.height);
            }}
            src={src}
            {...props}
          />
          {pins &&
            pins.map((booth: any, index: number) => {
              return (
                <Animated.View
                  ref={(el) => {
                    if (!pinsRef.current) {
                      pinsRef.current = [];
                    }
                    if (el) {
                      pinsRef.current[index] = el as any;
                    }
                  }}
                  key={index}
                  style={[
                    {
                      position: 'absolute',
                      zIndex: 100,
                      top: `${booth.y}%`,
                      left: `${booth.x}%`,
                      width: 22,
                      height: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    animatedStyleScale,
                  ]}
                >
                  {booth.render()}
                </Animated.View>
              );
            })}
        </Animated.View>
      </GestureDetector>
      <Image
        source={{ uri: src }}
        style={{ display: 'none' }}
        onLoad={({
          nativeEvent: {
            source: { width, height },
          },
        }) => {
          setImageWidth(width);
          setImageHeight(height);
        }}
      />
    </Animated.View>
  );
};

export default forwardRef(Zoomable);
