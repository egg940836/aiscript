// A simple wrapper around the browser's SpeechSynthesis API.

let voices: SpeechSynthesisVoice[] = [];

// Populates the voices array. This can be tricky because voices load asynchronously.
function populateVoiceList() {
  if (typeof speechSynthesis === 'undefined') {
    return;
  }
  
  const availableVoices = speechSynthesis.getVoices();
  if (availableVoices.length > 0) {
      voices = availableVoices;
  }

  // If voices are not loaded yet, set an event listener.
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => voices = speechSynthesis.getVoices();
  }
}

populateVoiceList();

export const ttsService = {
  speak: (
    text: string,
    onBoundary: (charIndex: number) => void,
    onEnd: () => void
  ) => {
    if (typeof speechSynthesis === 'undefined' || !text) {
      console.warn("Speech Synthesis not supported or no text provided.");
      onEnd();
      return;
    }
    
    // Stop any currently playing speech to avoid overlaps.
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onend = onEnd;

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // It's common for `speechSynthesis.cancel()` to trigger an error event with the 'canceled' type.
      // This is expected when stopping or interrupting speech, so we don't log it as an error.
      // The `onend` handler will be called automatically by the browser in this case, resetting the UI state.
      if (event.error === 'canceled') {
        return;
      }

      console.error(`SpeechSynthesisUtterance Error: ${event.error}`, event);
      // For other, unexpected errors, we explicitly call onEnd to ensure the UI state is reset.
      onEnd();
    };

    utterance.onboundary = (event) => {
        onBoundary(event.charIndex);
    };

    // Attempt to find a suitable voice, prioritizing Taiwanese Mandarin.
    const preferredVoice = voices.find(voice => voice.lang === 'zh-TW' && voice.name.includes('Female')) 
                        || voices.find(voice => voice.lang === 'zh-TW')
                        || voices.find(voice => voice.lang.startsWith('zh-CN')) // Fallback to mainland Chinese
                        || voices.find(voice => voice.lang.startsWith('zh'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    } else if (voices.length > 0) {
        // Fallback to the first available voice if no Chinese voice is found.
        // This might happen if the voice list hasn't populated yet.
        console.warn("Chinese (zh-TW) voice not found. Using default.");
    }
    
    // Default speech parameters
    utterance.pitch = 1;
    utterance.rate = 1.5; // Speed
    utterance.volume = 1;
    
    speechSynthesis.speak(utterance);
  },

  stop: () => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
  },
};