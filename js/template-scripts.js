jQuery(document).ready(function($) {  
  // Owl Carousel                     
  var owl = $('.carousel-fade-transition');
  owl.owlCarousel({
    nav: true,
    dots: true,
    items: 1,
    loop: true,
    navText: ["&#xe605","&#xe606"],
    autoplay: true, 
    animateOut: 'fadeOut',
    autoplayTimeout: 5000
  });
});
<script>
function displayThankYouMessage() {
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('thank-you-message').style.display = 'block';
}
</script>
