import { useState } from "react";

export function useErrorModal() {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState("Error");
    const [text, setText] = useState("");

    const showError = (
        error: unknown,
        customTitle = "Error"
    ) => {
        console.log('[showError] called with:', error, customTitle);
        setTitle(customTitle);

        if (error instanceof Error) {
            setText(error.message);
        } else {
            setText(String(error));
        }

        setVisible(true);
    };

    return {
        visible,
        title,
        text,
        showError,
        closeError: () => setVisible(false),
    };
}