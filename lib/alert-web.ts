import { Alert, Platform } from "react-native";

if (Platform.OS === "web") {
  Alert.alert = (
    title?: string,
    message?: string,
    buttons?: Array<{ text?: string; onPress?: () => void; style?: string }>,
    _options?: any
  ) => {
    const fullText = [title, message].filter(Boolean).join("\n\n");

    if (!buttons || buttons.length === 0) {
      if (typeof window !== "undefined") {
        window.alert(fullText);
      }
      return;
    }

    if (buttons.length === 1) {
      if (typeof window !== "undefined") {
        window.alert(fullText);
      }
      buttons[0].onPress?.();
      return;
    }

    // Two or more buttons (e.g. confirmation dialogs like Logout or Delete)
    const cancelBtn = buttons.find((b) => b.style === "cancel");
    const actionBtn =
      buttons.find((b) => b !== cancelBtn && b.style !== "cancel") ||
      buttons[buttons.length - 1];

    let confirmed = false;
    try {
      if (typeof window !== "undefined") {
        confirmed = window.confirm(fullText);
      } else {
        confirmed = true;
      }
    } catch {
      confirmed = true;
    }

    if (confirmed) {
      actionBtn?.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
  };
}
