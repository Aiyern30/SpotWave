"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { EventData } from "@/lib/events"; // TicketMaster EventData type
import { fetchEvents } from "@/utils/Events/fetchEvent"; // Your TicketMaster fetch function
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui";
import EventsInfo from "@/components/Events/EventsInfo";
import { fetchMusicEvents } from "@/utils/Events/fetchPreditHQEvents";
import PredictHQEventData from "@/lib/predictHqEvent";
import GoogleMaps from "@/components/Events/GoogleMap";

const EventsPage = () => {
  const [ticketMasterEvents, setTicketMasterEvents] = useState<EventData[]>([]);
  const [predictHQEvents, setPredictHQEvents] = useState<PredictHQEventData[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("ticketmaster");

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedSource === "ticketmaster") {
        const lat = 3.1350522;
        const long = 101.7293243;
        const { events: ticketMasterEvents, error: ticketMasterError } =
          await fetchEvents(lat, long);
        if (ticketMasterError) {
          setError(ticketMasterError);
        } else {
          setTicketMasterEvents(ticketMasterEvents);
        }
      } else if (selectedSource === "predicthq") {
        const predictHQEvents = await fetchMusicEvents();
        console.log("Fetched PredictHQ Events:", predictHQEvents);
        setPredictHQEvents(predictHQEvents);
      }
    } catch (err) {
      setError("Failed to fetch events.");
    }
    setLoading(false);
  }, [selectedSource]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const SkeletonEventCard = () => (
    <div>
      <Skeleton className="w-full h-48 rounded-t-xl" />
      <CardTitle className="text-lg font-semibold p-3">
        <Skeleton className="h-5 w-3/4" />
      </CardTitle>
      <CardFooter className="text-sm text-gray-500 p-3">
        <Skeleton className="h-4 w-1/2" />
      </CardFooter>
    </div>
  );

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
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="p-2 mb-4"
        >
          <option value="ticketmaster">TicketMaster</option>
          <option value="predicthq">PredictHQ</option>
        </select>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {[...Array(9)].map((_, index) => (
              <SkeletonEventCard key={index} />
            ))}
          </div>
        )}

        {error && <p className="text-red-500">{error}</p>}

        {!loading &&
        selectedSource === "ticketmaster" &&
        ticketMasterEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {ticketMasterEvents.map((event) => (
              <Card
                key={event.id}
                className="bg-white group w-full cursor-pointer hover:shadow-lg hover:bg-white"
                onClick={() => handleEventSelect(event.id)}
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
            ))}
          </div>
        ) : selectedSource === "predicthq" &&
          !loading &&
          predictHQEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {predictHQEvents.map((event) => (
              <Card
                key={event.id}
                className="bg-white group w-full cursor-pointer hover:shadow-lg hover:bg-white"
                onClick={() => handleEventSelect(event.id)}
              >
                <CardHeader className="p-0">
                  {/* Replace Avatar with GoogleMaps component */}
                  {event?.geo?.geometry?.coordinates?.length > 0 ? (
                    <div className="w-full h-48">
                      <GoogleMaps
                        lat={event.geo.geometry.coordinates[1]} // Latitude from event data
                        lon={event.geo.geometry.coordinates[0]} // Longitude from event data
                        mapStyle={[]} // Optional: pass any map style you want
                      />
                    </div>
                  ) : (
                    <div>No Map Available</div>
                  )}
                </CardHeader>

                <CardTitle className="text-lg font-semibold p-3">
                  {event.title}
                </CardTitle>

                <CardFooter className="text-sm text-gray-500 p-3">
                  {event.start_local} - {event.state || "Venue Unknown"}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          !loading && <p>No events found.</p>
        )}

        {/* Dialog for Event Details */}
        {selectedEventId && (
          <EventsInfo
            eventId={selectedEventId}
            onClose={() => setSelectedEventId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default EventsPage;
