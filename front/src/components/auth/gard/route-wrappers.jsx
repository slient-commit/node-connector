import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import AuthService from "./../../../services/auth.service";

const authService = new AuthService();

export const PrivateRoute = ({ children }) => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setStatus("denied");
      return;
    }
    authService.verify().then((valid) => {
      if (!valid) {
        authService.logout();
      }
      setStatus(valid ? "ok" : "denied");
    });
  }, []);

  if (status === "loading") return null;
  if (status === "denied") return <Navigate to="/login" replace />;
  return children;
};

export const GuestOnlyRoute = ({ children }) => {
  if (authService.isAuthenticated()) {
    return <Navigate to="/editor" replace />;
  }
  return children;
};
