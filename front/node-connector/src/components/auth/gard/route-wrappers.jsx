import React from "react";
import { Navigate } from "react-router-dom";
import AuthService from "./../../../services/auth.service";

const authService = new AuthService();

export const PrivateRoute = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const GuestOnlyRoute = ({ children }) => {
  if (authService.isAuthenticated()) {
    return <Navigate to="/editor" replace />;
  }
  return children;
};
