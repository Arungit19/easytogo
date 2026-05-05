import React,{Fragment} from 'react'
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import HowItWorks from '../components/HowItWorks';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

const page = () => {
  return (
<Fragment>
<Navbar/>
<Hero/>
<About/>
<Services/>
<HowItWorks/>
<Contact/>
<Footer/>
</Fragment>

  )
}

export default page;