class WaveformVisualizer {
    constructor(callback) {
        this.state = 'idle';
        this.videoCallback = callback;
        this.setState('idle');
    }

    setIdleState() {
        this.setState('idle');
    }

    setThinkingState() {
        this.setState('thinking');
    }

    startSpeakingAnimation() {
        this.setState('speaking');
    }

    stopAnimation() {
        this.setState('idle');
    }

    setState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        if (this.videoCallback && typeof this.videoCallback === 'function') {
            this.videoCallback(newState);
        }
    }
}
