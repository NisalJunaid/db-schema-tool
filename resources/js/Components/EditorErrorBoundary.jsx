import React from 'react';

export default class EditorErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Editor crashed:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen items-center justify-center bg-slate-100">
                    <div className="rounded-lg bg-white p-6 shadow">
                        <h2 className="mb-2 text-lg font-semibold text-red-600">Editor crashed</h2>
                        <pre className="text-xs text-slate-600">{String(this.state.error)}</pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
