import React from 'react';
import { useRouter } from 'next/navigation';

const ErrorPage = ({ errorMessage, showRetryButton = false }: { errorMessage: string, showRetryButton?: boolean }) => {
    const router = useRouter();

    const handleRetry = () => {
        // Reload the current page or perform any retry logic
        router.refresh();
    };

    const handleGoHome = () => {
        router.push('/');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-red-600 mb-4">Error</h1>
                <p className="text-gray-700 mb-6">{errorMessage}</p>
                <div className="flex gap-4">
                    {showRetryButton && (
                        <button
                            onClick={handleRetry}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
                        >
                            Retry
                        </button>
                    )}
                    <button
                        onClick={handleGoHome}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-all"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
