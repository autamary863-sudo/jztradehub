import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface AdSlide {
  id: string;
  image_url: string;
  link?: string;
  title?: string;
}

interface AdSettings {
  enabled: boolean;
  slides: AdSlide[];
}

const AdCarousel = () => {
  const [settings, setSettings] = useState<AdSettings | null>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ad_slides")
      .maybeSingle();

    if (data?.value) {
      setSettings(data.value as unknown as AdSettings);
    }
  };

  if (!settings?.enabled || !settings?.slides?.length) return null;

  return (
    <section className="py-8 bg-muted/30">
      <div className="container px-4">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {settings.slides.map((slide) => (
              <CarouselItem
                key={slide.id}
                className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3"
              >
                {slide.link ? (
                  <a
                    href={slide.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="relative overflow-hidden rounded-xl border border-border group">
                      <img
                        src={slide.image_url}
                        alt={slide.title || "Advertisement"}
                        className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                      />
                      {slide.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                          <p className="text-white font-medium">{slide.title}</p>
                        </div>
                      )}
                    </div>
                  </a>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-border">
                    <img
                      src={slide.image_url}
                      alt={slide.title || "Advertisement"}
                      className="w-full h-48 object-cover"
                    />
                    {slide.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <p className="text-white font-medium">{slide.title}</p>
                      </div>
                    )}
                  </div>
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </div>
    </section>
  );
};

export default AdCarousel;
