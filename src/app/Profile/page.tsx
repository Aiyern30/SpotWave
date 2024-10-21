"use client";

import Header from "@/components/Header";
import React, { useState } from "react";
import Sidebar from "../Sidebar";
import ProfileComponent from "./Profile";

const Profile = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-4 ">
          <Header />
          <ProfileComponent />
        </div>
      </div>
    </div>
  );
};

export default Profile;
