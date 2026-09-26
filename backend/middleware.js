function requireLogin(req, res, next) {

    if (!req.session.userId) {
        return res.status(401).json({
            error: "You must be logged in."
        });
    }

    next();
}


function requireOwner(req, res, next) {

    if (!req.session.userId) {
        return res.status(401).json({
            error: "You must be logged in."
        });
    }

    if (req.session.role !== "owner") {
        return res.status(403).json({
            error: "Owner access required."
        });
    }

    next();
}


module.exports = {
    requireLogin,
    requireOwner
};