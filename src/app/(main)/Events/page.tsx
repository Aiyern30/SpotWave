"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Event } from "@/lib/types";
import { fetchEvents } from "@/utils/Events/fetchEvent";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui";

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLoading(true);
          const { events, error } = await fetchEvents(latitude, longitude);
          if (error) setError(error);
          setEvents(events);
          setLoading(false);
        },
        () => {
          setError("Geolocation is disabled or not available.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setLoading(false);
    }
  }, []);

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
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {events.length > 0 ? (
            events.map((event) => (
              <Card
                key={event.id}
                className="bg-white group w-full cursor-pointer hover:shadow-lg hover:bg-white"
                onClick={() => window.open(event.url, "_blank")}
              >
                <CardHeader className="p-0">
                  <Avatar className="w-full h-48 relative">
                    {event.images?.length > 0 ? (
                      <AvatarImage
                        src={event.images[0].url}
                        className="rounded-t-xl w-full h-48 object-cover"
                      />
                    ) : (
                      <AvatarFallback className="rounded-xl text-black">
                        No Image
                      </AvatarFallback>
                    )}
                  </Avatar>
                </CardHeader>

                <CardTitle className="text-lg font-semibold p-3">
                  {event.name}
                </CardTitle>

                <CardFooter className="text-sm text-gray-500 p-3">
                  {event.dates?.start?.localDate}{" "}
                  {event.dates?.start?.localTime} -{" "}
                  {event._embedded?.venues?.[0]?.name || "Venue Unknown"}
                </CardFooter>
              </Card>
            ))
          ) : (
            <p>No events found near you.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
