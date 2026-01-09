/**
 * @deprecated Use FluentStack with gap prop or FluentSpacing tokens instead.
 * This component is kept for backward compatibility but will be removed in a future version.
 */
import { View } from "react-native";

type Props = {
  width?: number;
  height?: number;
};

export default function Spacer(props: Props) {
  const width: number = props.width ?? 1;
  const height: number = props.height ?? 1;

  return (
    <View
      style={{
        width,
        height,
      }}
    />
  );
}
