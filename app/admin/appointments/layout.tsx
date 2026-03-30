'use client';

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/services/adminuser";
import { useRouter } from "next/navigation";

export default function AppointmentsLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await getCurrentUser();
                
                if (!user) {
                    router.push('/auth/login');
                    return;
                }
                
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Auth error:', error);
                router.push('/auth/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-xl font-semibold">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-xl font-semibold">Please login to access this page</div>
            </div>
        );
    }

    return (
        <>
            {children}
        </>
    );
}
