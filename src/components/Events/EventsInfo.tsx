"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui";
import { EventData } from "@/lib/events";
import { fetchEventById } from "@/utils/Events/fetchEventByID";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface EventsInfoProps {
  eventId: string;
  onClose: () => void; // Close callback
}

const SkeletonEventDetails = () => (
  <div>
    <div className="w-full h-48 bg-gray-300 mb-4 rounded-xl" />
    <div className="w-3/4 h-6 bg-gray-300 mb-2" />
    <div className="w-1/2 h-4 bg-gray-300 mb-2" />
    <div className="w-2/3 h-4 bg-gray-300 mb-2" />
  </div>
);

const EventsInfo: React.FC<EventsInfoProps> = ({ eventId, onClose }) => {
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch event details when the component mounts
  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      const { event, error } = await fetchEventById(eventId);
      if (error) setError(error);
      setEvent(event);
      setLoading(false);
    };

    fetchEventDetails();
  }, [eventId]);

  // Helper function to format dates
  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle className="text-3xl md:text-4xl">
            {loading ? "Loading..." : event?.name}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {loading ? "Please wait..." : event?.description}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[80vh] overflow-y-auto p-4">
          {loading ? (
            <SkeletonEventDetails />
          ) : (
            <>
              {/* Event Images */}
              <div className="mb-6">
                {event?.images[0].url && (
                  <Image
                    key={event?.images[0].url}
                    src={event?.images[0].url}
                    alt={event?.name}
                    width={1000}
                    height={300}
                    className="w-full h-[300px] object-cover rounded-xl mb-4"
                  />
                )}
              </div>

              {/* Event Dates */}
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-2">
                  Event Dates
                </h2>
                <p className="text-xs sm:text-sm">
                  <strong>Event Start:</strong>{" "}
                  {formatDate(event?.dates.start.dateTime || "")}
                </p>
                {event?.dates.end?.dateTime && (
                  <p className="text-xs sm:text-sm">
                    <strong>Event End:</strong>{" "}
                    {formatDate(event?.dates.end.dateTime)}
                  </p>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-2">
                  Ticket Pricing
                </h2>
                {event?.priceRanges?.map((priceRange, index) => (
                  <p key={index} className="text-xs sm:text-sm">
                    <strong>
                      {priceRange.currency} {priceRange.min} - {priceRange.max}
                    </strong>
                  </p>
                ))}
              </div>

              {/* Ticket Limit */}
              {event?.ticketLimit && (
                <div className="mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                    Ticket Limit
                  </h2>
                  <p className="text-xs sm:text-sm">
                    {event?.ticketLimit.info}
                  </p>
                </div>
              )}

              {/* Venue Information */}
              {event?._embedded?.venues?.[0] && (
                <div className="mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                    Venue Information
                  </h2>
                  <p className="text-xs sm:text-sm">
                    <strong>Venue Name:</strong>{" "}
                    {event?._embedded?.venues[0]?.name}
                  </p>
                  <p className="text-xs sm:text-sm">
                    <strong>Location:</strong>{" "}
                    {event?._embedded?.venues[0]?.city?.name},{" "}
                    {event?._embedded?.venues[0]?.country?.name}
                  </p>
                  <p className="text-xs sm:text-sm">
                    <strong>Address:</strong>{" "}
                    {event?._embedded?.venues[0]?.address?.line1}
                  </p>
                </div>
              )}
            </>
          )}
          {event?.url && (
            <Button
              onClick={() => router.push(event?.url || "")}
              variant={"secondary"}
              className="w-full"
            >
              More Info: Event Link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventsInfo;
