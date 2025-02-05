import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui";
import { EventData } from "@/lib/events";

interface EventsInfoProps {
  event: EventData;
  onClose: () => void; // Close callback
}

const EventsInfo: React.FC<EventsInfoProps> = ({ event, onClose }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event.name}</DialogTitle>
          <DialogDescription>{event.description}</DialogDescription>
        </DialogHeader>
        <div>
          <p>
            <strong>Start Date:</strong> {event.dates?.start?.localDate}{" "}
            {event.dates?.start?.localTime}
          </p>
          <p>
            <strong>Venue:</strong> {event._embedded?.venues?.[0]?.name}
          </p>
          <p>
            <strong>Location:</strong>{" "}
            {event._embedded?.venues?.[0]?.city?.name},{" "}
            {event._embedded?.venues?.[0]?.country?.name}
          </p>
          <p>
            <strong>Price:</strong> {event.priceRanges?.[0]?.currency}{" "}
            {event.priceRanges?.[0]?.min} - {event.priceRanges?.[0]?.max}
          </p>
          <p>
            <strong>More Info:</strong>{" "}
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              Event Link
            </a>
          </p>
        </div>
        <DialogClose onClick={onClose}>Close</DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default EventsInfo;
