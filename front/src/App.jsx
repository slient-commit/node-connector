import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginComponent from "./components/auth/login/login.component";
import RegisterComponent from "./components/auth/register/register.component";
import EditorComponent from "./components/editor/editor.component";
import { PrivateRoute, GuestOnlyRoute } from "./components/auth/gard/route-wrappers";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestOnlyRoute><LoginComponent /></GuestOnlyRoute>} />
        <Route path="/" element={<GuestOnlyRoute><LoginComponent /></GuestOnlyRoute>} />
        <Route path="/register" element={<GuestOnlyRoute><RegisterComponent /></GuestOnlyRoute>} />
        <Route path="/editor" element={<PrivateRoute><EditorComponent /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
