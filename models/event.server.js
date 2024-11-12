import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export async function createEventsList({ npubKey, eventId }) {
  try {
    const eventsList = await prisma.eventsList.create({
      data: {
        npubKey,
        eventId,
      },
    });
    return { eventsList };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: "Failed to create events list." };
    }
    throw error;
  }
}

export async function getEventsList({ npubKey, eventId }) {
  try {
    const eventsList = await prisma.eventsList.findMany({
      where: {
        npubKey,
        eventId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { eventsList };
  } catch (error) {
    return { error: "Failed to get events list." };
  }
}
