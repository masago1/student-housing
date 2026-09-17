export const dynamic = "force-dynamic";

export async function POST(request) {
    try {
        const body = await request.json();

        const address =
            typeof body?.address === "string"
                ? body.address.trim()
                : "";

        const city =
            typeof body?.city === "string"
                ? body.city.trim()
                : "";

        if (!address || !city) {
            return Response.json(
                {
                    error:
                        "Adresa și orașul sunt obligatorii.",
                },
                {
                    status: 400,
                }
            );
        }

        const query =
            `${address}, ${city}, România`;

        const params =
            new URLSearchParams({
                q: query,
                format: "jsonv2",
                limit: "1",
                countrycodes: "ro",
                addressdetails: "1",
            });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "StudentHousing/1.0",
                    "Accept-Language":
                        "ro,en;q=0.8",
                    Accept:
                        "application/json",
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            console.error(
                "Nominatim status:",
                response.status
            );

            return Response.json(
                {
                    error:
                        "Serviciul de localizare nu a răspuns corect.",
                },
                {
                    status: 502,
                }
            );
        }

        const results =
            await response.json();

        if (
            !Array.isArray(results) ||
            results.length === 0
        ) {
            return Response.json(
                {
                    error:
                        "Adresa nu a putut fi localizată. Verifică strada și numărul.",
                },
                {
                    status: 404,
                }
            );
        }

        const latitude =
            Number(results[0].lat);

        const longitude =
            Number(results[0].lon);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return Response.json(
                {
                    error:
                        "Coordonatele primite nu sunt valide.",
                },
                {
                    status: 500,
                }
            );
        }

        return Response.json(
            {
                latitude,
                longitude,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "Eroare geocodare:",
            error
        );

        return Response.json(
            {
                error:
                    "Adresa nu a putut fi localizată momentan.",
            },
            {
                status: 500,
            }
        );
    }
}
