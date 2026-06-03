function HeroContainer({
  backgroundImage,
  children,
}: {
  backgroundImage: string
  children: React.ReactNode
}) {
  return (
    <section className='hero-container' style={{ backgroundImage: `url(${backgroundImage})` }}>
      {children}
    </section>
  )
}

export default HeroContainer
