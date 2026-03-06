import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import AuthService from "./../../../services/auth.service";

const authService = new AuthService();

export const PrivateRoute = ({ children }) => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    authService.isAuthenticated().then((valid) => {
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
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    authService.isAuthenticated().then((valid) => {
      setStatus(valid ? "authenticated" : "guest");
    });
  }, []);

  if (status === "loading") return null;
  if (status === "authenticated") return <Navigate to="/editor" replace />;
  return children;
};
