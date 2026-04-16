import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiHome, FiGrid, FiSearch, FiHeart, FiUser } from "react-icons/fi";
import { useWishlistStore } from "../../../../shared/store/wishlistStore";
import { useAuthStore } from "../../../../shared/store/authStore";

const MobileBottomNav = () => {
  const location = useLocation();
  const wishlistCount = useWishlistStore((state) => state.getItemCount());
  const { isAuthenticated } = useAuthStore();

  const navItems = [
    { path: "/home",       icon: FiHome,   label: "Home"       },
    { path: "/categories", icon: FiGrid,   label: "Categories" },
    { path: "/search",     icon: FiSearch, label: "Search"     },
    {
      path: "/wishlist",
      icon: FiHeart,
      label: "Wishlist",
      badge: wishlistCount > 0 ? wishlistCount : null,
    },
    {
      path: isAuthenticated ? "/profile" : "/login",
      icon: FiUser,
      label: "Account",
    },
  ];

  const isActive = (path) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  const navContent = (
    /* Outer wrapper — provides safe-area spacing */
    <div className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden pointer-events-none pb-3 px-4">
      {/* Floating pill container */}
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 28, delay: 0.1 }}
        className="pointer-events-auto mx-auto max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.6) inset",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        <div className="flex items-center justify-around py-1.5 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center flex-1 py-1 rounded-xl"
              >
                {/* Active background pill */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="navActivePill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "linear-gradient(135deg,#EDE9FE,#DDD6FE)" }}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon + badge */}
                <motion.div
                  className="relative z-10"
                  whileTap={{ scale: 0.82 }}
                  animate={active
                    ? { scale: 1.1, y: -1 }
                    : { scale: 1, y: 0 }
                  }
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className="text-[17px]"
                    style={{
                      stroke: active ? "#6D28D9" : "#9CA3AF",
                      strokeWidth: active ? 2.5 : 1.8,
                      fill: "none",
                    }}
                  />
                  {/* Badge */}
                  {item.badge && (
                    <motion.span
                      key={item.badge}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white border border-white z-20"
                      style={{ backgroundColor: "#ffc101", fontSize: "7px", fontWeight: 800 }}
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </motion.span>
                  )}
                </motion.div>

                {/* Label — always visible, bold when active */}
                <span
                  className="relative z-10 mt-0.5 leading-none"
                  style={{
                    fontSize: "8px",
                    fontWeight: active ? 700 : 500,
                    color: active ? "#6D28D9" : "#9CA3AF",
                    letterSpacing: "0.02em",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );

  return createPortal(navContent, document.body);
};

export default MobileBottomNav;
