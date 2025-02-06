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
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/components/ui";
import EventsInfo from "@/components/Events/EventsInfo";
import { fetchMusicEvents } from "@/utils/Events/fetchPreditHQEvents";
import PredictHQEventData from "@/lib/predictHqEvent";
import GoogleMaps from "@/components/Events/GoogleMap";
import { styles } from "@/lib/mapStyles";
import { formatDate, formatDuration } from "@/utils/function";
import NoEventsFound from "@/components/NoEventsFound";

const EventsPage = () => {
  const [ticketMasterEvents, setTicketMasterEvents] = useState<EventData[]>([]);
  const [predictHQEvents, setPredictHQEvents] = useState<PredictHQEventData[]>(
    []
  );

  console.log("predictHQEvents", predictHQEvents);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] =
    useState<EventType>("TICKETMASTER");

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedSource === "TICKETMASTER") {
        const lat = 3.1350522;
        const long = 101.7293243;
        const { events: ticketMasterEvents, error: ticketMasterError } =
          await fetchEvents(lat, long);
        if (ticketMasterError) {
          setError(ticketMasterError);
        } else {
          setTicketMasterEvents(ticketMasterEvents);
        }
      } else if (selectedSource === "PREDICTHQ") {
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
        <div className="p-6">
          <Select
            value={selectedSource}
            onValueChange={(value) => setSelectedSource(value as EventType)} // ✅ Fix
          >
            <SelectTrigger className="p-2 w-[200px]">
              <SelectValue placeholder="Select Event Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TICKETMASTER">TicketMaster</SelectItem>
              <SelectItem value="PREDICTHQ">PredictHQ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 pt-0">
            {[...Array(9)].map((_, index) => (
              <SkeletonEventCard key={index} />
            ))}
          </div>
        )}

        {error && <p className="text-red-500">{error}</p>}

        {!loading &&
        selectedSource === "TICKETMASTER" &&
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
        ) : selectedSource === "PREDICTHQ" &&
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
                  {event?.geo?.geometry?.coordinates?.length > 0 ? (
                    <div
                      className="w-full h-48"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GoogleMaps
                        lat={event.geo.geometry.coordinates[1]}
                        lon={event.geo.geometry.coordinates[0]}
                        address={event.geo.address.formatted_address}
                        mapStyle={styles["hybrid"]}
                      />
                    </div>
                  ) : (
                    <div>No Map Available</div>
                  )}
                </CardHeader>

                <CardTitle className="text-lg font-semibold p-3">
                  {event.title}
                </CardTitle>
                <CardContent className="text-xs p-3 flex flex-col space-y-3">
                  <div>{event.geo.address.formatted_address}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="text-xl text-left font-bold">
                        {event.predicted_event_spend}
                      </div>
                      <div className="text-xs text-gray-500">
                        Predicted spend
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xl text-right font-bold">
                        {event.phq_attendance}
                      </div>
                      <div className="text-xs text-gray-500">
                        Predicted attendance
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-gray-500 p-3">
                  {event.start_local
                    ? formatDate(event.start_local, true)
                    : event.start
                    ? formatDate(event.start, true)
                    : null}{" "}
                  -{" "}
                  {event.predicted_end_local
                    ? formatDate(event.predicted_end_local, true)
                    : event.predicted_end
                    ? formatDate(event.predicted_end, true)
                    : event.end
                    ? formatDate(event.end, true)
                    : null}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (!loading && ticketMasterEvents.length === 0) ||
          predictHQEvents.length === 0 ? (
          <NoEventsFound onRetry={() => setSelectedSource("TICKETMASTER")} />
        ) : null}

        {/* Dialog for Event Details */}
        {selectedEventId && (
          <EventsInfo
            eventId={selectedEventId}
            source={selectedSource}
            onClose={() => setSelectedEventId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default EventsPage;
