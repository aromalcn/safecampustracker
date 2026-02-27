import { supabase } from '../supabase-config';

// Mock mode if config is missing (basic check)
const isMock = !supabase;

export const loginUser = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;

    // Return a structure compatible with the existing usage (user.uid)
    return {
        user: {
            uid: data.user.id,
            email: data.user.email,
            ...data.user
        },
        session: data.session
    };
};

export const registerUser = async (email, password, userData) => {
    // 1. Create User in Authentication
    console.log("Signing up with:", email, userData.username);
    const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
            data: {
                username: userData.username,
                role: userData.role,
                department: userData.department || "N/A",
                semester: userData.semester || 1
            }
        }
    });

    if (error) {
        console.error("Supabase Auth Error:", error);
        throw error;
    }
    
    // Auth User Object
    const user = data.user;
    console.log("Auth success, user:", user?.id);

    if (user) {
        // 2. Explicitly ensure Database Insertion in 'users' table
        // We use upsert to be safe
        const { error: dbError } = await supabase
            .from('users')
            .upsert([{
                uid: user.id,
                email: email,
                username: userData.username, // Force username from form
                role: userData.role,
                id_number: userData.idNumber,
                department: userData.department || "N/A",
                semester: userData.semester ? parseInt(userData.semester) : 1,
                created_at: new Date().toISOString()
            }]);
        
        if (dbError) {
            console.error("Database Insert/Upsert Error:", dbError);
            throw new Error("Failed to save user profile to database: " + dbError.message);
        } else {
            console.log("Database profile created successfully.");
        }
    }

    return {
        user: {
            uid: user?.id,
            email: user?.email,
            ...user
        }
    };
};

export const getUserRole = async (uid) => {
    // 1. Try to get role from public database (Most accurate)
    let { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('uid', uid)
        .single();
    
    if (data?.role) {
        return data.role;
    }

    // 2. Fallback: Get role from Auth Metadata (Faster, available immediately after signup)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.role) {
        console.log("Using metadata role fallback:", user.user_metadata.role);
        return user.user_metadata.role;
    }
    
    if (error) {
        console.error("Get Role Error:", error);
    }
    
    return 'student'; // Default fallback
};

export const logoutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

