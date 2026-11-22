import { youtubeId, youtubeStart } from "@/lib/video";

// One video per post. YouTube plays here in the page (privacy-enhanced embed, nothing loads until play);
// a link from any other site is a button that opens it in a new tab.
export function PostVideo({ url, title }: { url: string; title: string }) {
  const id = youtubeId(url);
  if (!id) {
    return (
      <section id="video" className="post-video">
        <a className="button-link wide outline" href={url} target="_blank" rel="noreferrer">
          ▶&nbsp; לצפייה בווידאו
        </a>
      </section>
    );
  }
  const start = youtubeStart(url);
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0${start ? `&start=${start}` : ""}`;
  return (
    <section id="video" className="post-video" aria-labelledby="video-title">
      <h2 id="video-title" className="post-video-title">
        צפייה בווידאו
      </h2>
      <div className="post-video-frame">
        <iframe
          src={src}
          title={`וידאו: ${title}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </section>
  );
}
