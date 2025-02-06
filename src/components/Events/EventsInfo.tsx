"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "../ui";
import { fetchEventById as fetchTicketmasterEventById } from "@/utils/Events/fetchEventByID";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PredictHQEventData from "@/lib/predictHqEvent";

interface EventsInfoProps {
  eventId?: string;
  source: EventType;
  onClose: () => void;
  predictHQEventData?: PredictHQEventData;
}

const SkeletonEventDetails = () => (
  <div>
    <Skeleton className="w-full h-48 mb-6 rounded-xl" />
    <Skeleton className="w-3/4 h-6 mb-4" />
    <Skeleton className="w-1/2 h-4 mb-4" />
    <Skeleton className="w-2/3 h-4 mb-6" />

    {/* Event Dates */}
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>

    {/* Ticket Pricing */}
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>

    {/* Venue Information */}
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4 mb-2" />
      <Skeleton className="w-3/4 h-4 mb-4" />
    </div>
    <div className="mb-6">
      <Skeleton className="w-full h-12 mb-2" />
    </div>
  </div>
);

const EventsInfo: React.FC<EventsInfoProps> = ({
  eventId,
  onClose,
  source,
  predictHQEventData, // New prop for PredictHQ data
}) => {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  console.log("eventId", eventId);
  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      let eventData = null;

      try {
        if (source === "TICKETMASTER" && eventId) {
          eventData = await fetchTicketmasterEventById(eventId);
        }

        console.log(`Fetched ${source} event data:`, eventData);
        setEvent(eventData);
      } catch (err) {
        console.error(`Error fetching event from ${source}:`, err);
        setError("Failed to load event details.");
      }

      setLoading(false);
    };

    if (source === "TICKETMASTER") {
      fetchEventDetails(); // Only fetch for Ticketmaster
    } else if (source === "PREDICTHQ" && predictHQEventData) {
      setEvent(predictHQEventData); // Use the passed PredictHQ event data
      setLoading(false);
    }
  }, [eventId, source, predictHQEventData]);

  // Helper function to format dates
  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  const getLargestImage = (
    images: { width: number; height: number; url: string }[]
  ) => {
    if (images.length === 0) return null;
    return images.reduce((largest, current) =>
      current.width > largest.width ? current : largest
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle className="text-3xl md:text-4xl">
            {loading
              ? "Loading..."
              : event?.name || event?.title || "No Event Found"}
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <div className="h-[80vh] overflow-y-auto p-4">
            {loading ? (
              <SkeletonEventDetails />
            ) : event ? (
              <>
                {/* Ticketmaster Data */}
                {source === "TICKETMASTER" && (
                  <>
                    {event?.images && event.images.length > 0 && (
                      <Image
                        key={getLargestImage(event.images)?.url}
                        src={getLargestImage(event.images)?.url || ""}
                        alt={event?.name}
                        width={1000}
                        height={300}
                        className="w-full h-[300px] object-cover rounded-xl mb-4"
                      />
                    )}

                    {event?.description && (
                      <p className="text-sm mb-6">{event.description}</p>
                    )}

                    {/* Event Dates */}
                    <div className="mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2">
                        Event Dates
                      </h2>
                      <p className="text-xs sm:text-sm">
                        <strong>Start:</strong>{" "}
                        {formatDate(event?.dates?.start?.dateTime || "")}
                      </p>
                      {event?.dates?.end?.dateTime && (
                        <p className="text-xs sm:text-sm">
                          <strong>End:</strong>{" "}
                          {formatDate(event.dates.end.dateTime)}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* PredictHQ Data */}
                {source === "PREDICTHQ" && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold mb-2">
                      {event?.title}
                    </h2>

                    {event?.description && (
                      <p className="text-sm mb-6">{event.description}</p>
                    )}

                    {/* Event Start Time */}
                    <div className="mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2">
                        Event Dates
                      </h2>
                      <p className="text-xs sm:text-sm">
                        <strong>Start:</strong> {formatDate(event?.start)}
                      </p>
                    </div>

                    {/* Venue Details */}
                    {event?.venue && (
                      <div className="mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2">
                          Venue Information
                        </h2>
                        <p className="text-xs sm:text-sm">
                          <strong>Venue:</strong> {event?.venue.name}
                        </p>
                        <p className="text-xs sm:text-sm">
                          <strong>Location:</strong> {event?.venue.location}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500">
                No event details available.
              </p>
            )}
          </div>

          {event?.url && (
            <div className="absolute -bottom-1 w-full">
              <Button
                onClick={() => router.push(event?.url || "")}
                variant={"secondary"}
                className="w-full"
              >
                More Info: Event Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventsInfo;
