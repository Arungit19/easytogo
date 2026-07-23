import React,{Fragment} from 'react'
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import HowItWorks from '../components/HowItWorks';
import Contact from '../components/Contact';

const page = () => {
  return (
<Fragment>
<Hero/>
<About/>
<Services/>
<HowItWorks/>
<Contact/>
</Fragment>

  )
}

export default page;
