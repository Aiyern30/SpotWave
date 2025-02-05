"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Event } from "@/lib/types";
import { fetchEvents } from "@/utils/Events/fetchEvent";

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="border p-4 rounded shadow-md">
                <h2 className="text-xl font-semibold">{event.name}</h2>

                {event._embedded?.venues?.[0] ? (
                  <p className="text-gray-600">
                    {event._embedded.venues[0].name},{" "}
                    {typeof event._embedded.venues[0].city === "string"
                      ? event._embedded.venues[0].city
                      : "City not available"}
                  </p>
                ) : (
                  <p className="text-gray-600">
                    Venue information not available
                  </p>
                )}

                <p className="text-sm text-gray-500">
                  {event.dates?.start?.localDate}{" "}
                  {event.dates?.start?.localTime}
                </p>

                {/* Safely display event images */}
                {event.images?.length > 0 && (
                  <Image
                    src={event.images[0].url}
                    alt={event.name}
                    width={300}
                    height={300}
                    className="mt-2 w-full h-40 object-cover rounded"
                  />
                )}

                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-blue-500 hover:underline"
                >
                  View Details
                </a>
              </div>
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
