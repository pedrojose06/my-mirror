import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Easing } from "react-native";
import { COLORS } from "../constants";

// Loader da marca Luxai: o frame (isotipo) com os 4 cantos pulsando
// em Royal Amethyst, evocando o "espelho" focando no look.
export function LuxaiLoader({ size = 96 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const rotateAnim = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    pulseAnim.start();
    rotateAnim.start();
    return () => {
      pulseAnim.stop();
      rotateAnim.stop();
    };
  }, [pulse, rotate]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const cornerLen = size * 0.32;
  const thickness = Math.max(3, size * 0.045);

  // Cada canto e duas barras formando um "L"
  const Corner = ({ style }: { style: object }) => (
    <View style={[{ position: "absolute" }, style]}>
      <View style={{ width: cornerLen, height: thickness, backgroundColor: COLORS.accent }} />
      <View style={{ width: thickness, height: cornerLen, backgroundColor: COLORS.accent }} />
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, opacity, transform: [{ scale }, { rotate: spin }] },
      ]}
    >
      {/* sup-esq */}
      <Corner style={{ top: 0, left: 0 }} />
      {/* sup-dir */}
      <View style={{ position: "absolute", top: 0, right: 0, alignItems: "flex-end" }}>
        <View style={{ width: cornerLen, height: thickness, backgroundColor: COLORS.accent }} />
        <View style={{ width: thickness, height: cornerLen, backgroundColor: COLORS.accent }} />
      </View>
      {/* inf-esq */}
      <View style={{ position: "absolute", bottom: 0, left: 0 }}>
        <View style={{ width: thickness, height: cornerLen, backgroundColor: COLORS.accent }} />
        <View style={{ width: cornerLen, height: thickness, backgroundColor: COLORS.accent }} />
      </View>
      {/* inf-dir */}
      <View style={{ position: "absolute", bottom: 0, right: 0, alignItems: "flex-end" }}>
        <View style={{ width: thickness, height: cornerLen, backgroundColor: COLORS.accent }} />
        <View style={{ width: cornerLen, height: thickness, backgroundColor: COLORS.accent }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
