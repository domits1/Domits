import React from 'react'
import Pages from "../Pages";
import style from "../Listings/styles/listing.module.css"

function ListingsView() {

  return (
    <div className={style.listing_menu}>
        <Pages/>
    </div>
  )
}

export default ListingsView