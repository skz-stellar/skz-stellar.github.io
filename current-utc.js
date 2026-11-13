class CurrentUTC extends HTMLElement {
  connectedCallback() {
    if (!this.time) {
      const label = document.createElement('span');
      label.className = 'current-utc-label';
      label.textContent = 'Current UTC';
      this.time = document.createElement('time');
      this.append(label, this.time);
    }

    this.refresh = () => {
      clearTimeout(this.timer);
      const now = new Date();
      const timestamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
      this.time.dateTime = timestamp;
      this.time.textContent = `${timestamp.slice(0, 10)} ${timestamp.slice(11, 19)} UTC`;
      // Read the clock each tick; delayed timers must never accumulate drift.
      this.timer = setTimeout(this.refresh, 1000 - (Date.now() % 1000));
    };

    document.addEventListener('visibilitychange', this.refresh);
    window.addEventListener('pageshow', this.refresh);
    this.refresh();
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
    document.removeEventListener('visibilitychange', this.refresh);
    window.removeEventListener('pageshow', this.refresh);
  }
}

customElements.define('current-utc', CurrentUTC);
