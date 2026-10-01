export async function GET(): Promise<Response> {
  return Response.json(
    {
      status: "ok",
      time: new Date().toISOString(),
    },
    { status: 200 }
  );
}
