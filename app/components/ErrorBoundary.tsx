import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("Unexpected error in application:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--discord-bg-main)",
            color: "var(--discord-text-normal)",
            padding: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--discord-bg-dark)",
              borderRadius: 8,
              padding: "24px 32px",
              border: "1px solid var(--discord-border)",
              maxWidth: 480,
              width: "100%",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: 20,
                marginBottom: 12,
                color: "var(--discord-text-header)",
              }}
            >
              予期しないエラーが発生しました
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--discord-text-muted)",
              }}
            >
              画面を再読み込みしても解消しない場合は、スタッフまでお知らせください。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

