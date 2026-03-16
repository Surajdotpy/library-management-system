import * as authService from './auth.service.js';
// POST /api/auth/login - Admin login
export async function login(req, res) {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Attempt login
        const result = await authService.loginUser(email, password);
        if (!result) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        // Login successful
        const { user, token } = result;
        const sanitizedUser = authService.sanitizeUser(user);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: sanitizedUser
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
}
// POST /api/auth/logout - Admin logout
export async function logout(req, res) {
    try {
        // In JWT authentication, logout is handled on client side
        // Server doesn't need to do anything (stateless)
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
}
// GET /api/auth/me - Get current logged in user
export async function getCurrentUser(req, res) {
    try {
        // User data is attached by auth middleware
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }
        // Fetch full user details from database
        const user = await authService.findUserByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const sanitizedUser = authService.sanitizeUser(user);
        res.status(200).json({
            success: true,
            user: sanitizedUser
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
}
//# sourceMappingURL=auth.controller.js.map