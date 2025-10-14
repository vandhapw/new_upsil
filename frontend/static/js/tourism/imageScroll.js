const scroller = document.getElementById("scroller");
const scrollProgress = document.getElementById("scroll-progress");

if (scroller && scrollProgress) {
  scroller.addEventListener("scroll", function () {
    let scrollPercent =
      (scroller.scrollLeft /
        (scroller.scrollWidth - scroller.clientWidth)) *
      100;
    scrollProgress.style.width = scrollPercent + "%";
  });
}