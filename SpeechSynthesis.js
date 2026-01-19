(SpeechSynthesis)
// ----------------------------------------------------------------------
const speech = new SpeechSynthesisUtterance();
let voices = [];

// Feature Name Mapping (ID -> i18n Key)
const featureMap = {
    'masterSwitch': 'settings_extension_switch',
    'audioEnabled': 'settings_audio_reactivity',
    'cameraShake': 'settings_camera_shake',
    'pointerActive': 'settings_pointer_follow',
    'visualizerActive': 'settings_visualizer_color',
    'ambientMode': 'settings_ambient_mode',
    'hueLoop': 'settings_hueloop'
};

function initSpeech() {
    speech.volume = 1;
    speech.rate = 1;
    speech.pitch = 1;
    speech.lang = chrome.i18n.getUILanguage() || 'en';

    // Load voices
    const loadVoices = () => {
        voices = window.speechSynthesis.getVoices();
        // Try to find a voice that matches the UI language
        const targetLang = speech.lang.substring(0, 2); // 'en' or 'es'
        const bestVoice = voices.find(v => v.lang.startsWith(targetLang));
        if (bestVoice) speech.voice = bestVoice;
        else if (voices.length > 0) speech.voice = voices[0];
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
}

function speakChange(elementId, isChecked) {
    if (!featureMap[elementId]) return;

    try {
        // Get Feature Name
        const key = featureMap[elementId];
        const featureName = chrome.i18n.getMessage(key) || elementId;

        // Get Status
        // Fallback strings if json update failed
        const isSpanish = chrome.i18n.getUILanguage().startsWith('es');
        const enabledText = isSpanish ? "Activado" : "Enabled";
        const disabledText = isSpanish ? "Desactivado" : "Disabled";

        // Try to get from i18n if available (assuming previous step might have worked or user added them)
        const i18nEnabled = chrome.i18n.getMessage("ui_enabled");
        const i18nDisabled = chrome.i18n.getMessage("ui_disabled");

        const status = isChecked ? (i18nEnabled || enabledText) : (i18nDisabled || disabledText);

        speech.text = `${featureName}: ${status}`;
        window.speechSynthesis.cancel(); // Stop previous
        window.speechSynthesis.speak(speech);
    } catch (e) {
        console.warn("Speech Error:", e);
    }
}

initSpeech();