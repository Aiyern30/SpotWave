"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui";
import { EventData } from "@/lib/events";
import { fetchEventById } from "@/utils/Events/fetchEventByID";

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
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Fetch event details when the component mounts
  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      const { event, error } = await fetchEventById(eventId);
      if (error) setError(error);
      setEvent(event);
      setLoading(false);

      // Open dialog once data is fetched
      setIsDialogOpen(true);
    };

    fetchEventDetails();
  }, [eventId]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{loading ? "Loading..." : event?.name}</DialogTitle>
          <DialogDescription>
            {loading ? "Please wait..." : event?.description}
          </DialogDescription>
        </DialogHeader>
        <div>
          {loading ? (
            <SkeletonEventDetails />
          ) : (
            <>
              <p>
                <strong>Start Date:</strong> {event?.dates?.start?.localDate}{" "}
                {event?.dates?.start?.localTime}
              </p>
              <p>
                <strong>Venue:</strong> {event?._embedded?.venues?.[0]?.name}
              </p>
              <p>
                <strong>Location:</strong>{" "}
                {event?._embedded?.venues?.[0]?.city?.name},{" "}
                {event?._embedded?.venues?.[0]?.country?.name}
              </p>
              <p>
                <strong>Price:</strong> {event?.priceRanges?.[0]?.currency}{" "}
                {event?.priceRanges?.[0]?.min} - {event?.priceRanges?.[0]?.max}
              </p>
              <p>
                <strong>More Info:</strong>{" "}
                <a href={event?.url} target="_blank" rel="noopener noreferrer">
                  Event Link
                </a>
              </p>
            </>
          )}
        </div>
        <DialogClose onClick={onClose}>Close</DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default EventsInfo;
