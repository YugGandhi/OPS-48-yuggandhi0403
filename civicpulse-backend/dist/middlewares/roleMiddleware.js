"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                message: `User role ${req.user?.role || 'unknown'} is not authorized to access this route`,
            });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
