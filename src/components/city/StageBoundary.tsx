"use client";

import { Component, type ReactNode } from "react";

interface Props {
  name: string;
  fallback: ReactNode;
  onFail: () => void;
  children: ReactNode;
}

export default class StageBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`${this.props.name} failed`, error);
    this.props.onFail();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
