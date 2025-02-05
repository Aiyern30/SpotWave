"use client";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";

interface Venue {
  name: string;
  city: string;
  country: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface EventImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

interface Event {
  id: string;
  name: string;
  _embedded: {
    venues: Venue[];
  };
  dates: {
    start: {
      localDate: string;
      localTime: string;
    };
  };
  images: EventImage[];
  url: string;
}

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const TICKETMASTER_API_KEY = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;

  const fetchEvents = useCallback(
    async (lat: number, long: number) => {
      try {
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${long}&apikey=${TICKETMASTER_API_KEY}`;
        console.log("Fetching:", url);

        const response = await axios.get(url);

        if (response.data._embedded?.events) {
          setEvents(response.data._embedded.events);
        } else {
          throw new Error("No events found.");
        }
      } catch (err: any) {
        console.error("Error fetching events:", err);
        setError(err.message || "Failed to fetch events.");
      } finally {
        setLoading(false);
      }
    },
    [TICKETMASTER_API_KEY]
  );

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchEvents(latitude, longitude);
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
  }, [fetchEvents]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Events Near You</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
                <p className="text-gray-600">Venue information not available</p>
              )}

              <p className="text-sm text-gray-500">
                {event.dates?.start?.localDate} {event.dates?.start?.localTime}
              </p>

              {/* Safely display event images */}
              {event.images?.length > 0 && (
                <Image
                  src={event.images[0].url}
                  alt={event.name}
                  width={300}
                  height={160}
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
  );
};

export default EventsPage;
