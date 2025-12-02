import { Component } from "@/components";
import { appState } from "@/state";
type State = {
};

export default class sideBar extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;

  getInitialState(): State {
    return {
      user: appState.auth.get().user,
    };
  }


onMount(): void {
  this.unsubscribe = appState.auth.subscribe((auth) => {
  });
}

  onUnmount(): void {
    this.unsubscribe?.();
  }
  protected attachEventListeners(): void {
      
  }
render(): string {
  return `
<div id="sideBar">
  <!-- DASHBOARD -->
  <div class="section">

    <a href="#" class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M3 9.75L12 4l9 5.75v8.5A2.75 2.75 0 0 1 18.25 21H5.75A2.75 2.75 0 0 1 3 18.25v-8.5Z" />
      </svg>
    </a>

    <a href="#" class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M16 3h4v4m0 10v4h-4m-8 0H4v-4m0-8V4h4m3 3l3 3m0 0l-3 3m3-3H8" />
      </svg>
    </a>

    <a href="#" class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM6.5 20a5.5 5.5 0 0 1 11 0v.5H6.5V20Z" />
      </svg>
    </a>
  </div>

  <!-- MATCHMAKING -->
  <div class="section">

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
      </svg>
    </a>

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 2c2 3 2 6 0 10s-2 7 0 10" />
      </svg>
    </a>

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M7 11l2 2 4-4m6 11H5a2 2 0 0 1-2-2V7" />
      </svg>
    </a>
  </div>

  <!-- GAME ROOMS -->
  <div class="section">

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    </a>

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 3l3 7h7l-5.5 4.5L18 22l-6-4-6 4 2.5-7.5L3 10h7z" />
      </svg>
    </a>

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 2v20m10-10H2" />
      </svg>
    </a>

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 4v16m8-8H4" />
      </svg>
    </a>
  </div>

  <!-- INFO -->
  <div class="section">
    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M4 6h16M4 12h16M4 18h12" />
      </svg>
    </a>

    <a class="item flex items-center gap-3">
      <svg class="w-5 h-5 text-pink-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 11c1.1 0 2-.9 2-2s-.9-2-2-2m0 6v6m8-4a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
      </svg>
    </a>
  </div>
</div>
`;
}

}
