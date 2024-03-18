import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

import close from '../assets/close.svg';

const Home = ({ home, provider, account, escrow, togglePop }) => {
    const [buyer, setBuyer] = useState(null);
    const [lender, setLender] = useState(null);
    const [inspector, setInspector] = useState(null);
    const [seller, setSeller] = useState(null);

    const [owner, setOwner] = useState(null)

    const [hasBought, setHasBought] = useState(false);
    const [hasLent, setHasLent] = useState(false);
    const [hasInspected, setHasInspected] = useState(false);
    const [hasSold, setHasSold] = useState(false);

    const fetchDetails = async() => {
        const buyer = await escrow.buyers(home.id)
        setBuyer(buyer)

        const hasBought = await escrow.approval(home.id, buyer)
        setHasBought(hasBought)
        
        const seller = await escrow.seller()
        setSeller(seller)

        const hasSold = await escrow.approval(home.id, seller)
        setHasSold(hasSold)

        const inspector = await escrow.inspector()
        setInspector(inspector)

        const hasInspected = await escrow.inspectionPassed(home.id)
        setHasInspected(hasInspected)

        const lender = await escrow.lender()
        setLender(lender)

        const hasLent = await escrow.approval(home.id, lender)
        setHasSold(hasLent)
    }

    const fetchOwner = async() => {
        if(await escrow.isListed(home.id)) return

        const owner = await escrow.buyers(home.id)
        setOwner(owner)
    }

    const buyHandler = async() => {
        const escrowAmount = await escrow.escrowAmounts(home.id);
        const signer = await provider.getSigner()

        //buyer deposits earnest
        let transaction = await escrow.connect(signer).depositEarnest(home.id, {value: escrowAmount})
        await transaction.wait()

        //buyer approves
        transaction = await escrow.connect(signer).approveSale(home.id);
        await transaction.wait()

        setHasBought(true)
    }

    const sellHandler = async() => {
        const signer = await provider.getSigner()

        //seller approves
        let transaction = await escrow.connect(signer).approveSale(home.id);
        await transaction.wait()

        //seller finalizes
        transaction = await escrow.connect(signer).finalizedSale(home.id);
        await transaction.wait()

        setHasSold(true)
    }

    const lendHandler = async() => {
        const signer = await provider.getSigner()

        //lender approves
        let transaction = await escrow.connect(signer).approveSale(home.id)
        await transaction.wait()

        //lender sends fund to contract
        const lentAmount = ((await escrow.purchasePrices(home.id)) - (await escrow.escrowAmounts(home.id)))
        await signer.sendTransaction({to: escrow.address, value: lentAmount.toString(), gasLimit: 60000})

        setHasLent(true)
    }

    const inspectHandler = async() => {
        const signer = await provider.getSigner()

        //inspector updates status
        let transaction = await escrow.connect(signer).updateInspectionStatus(home.id, true)
        await transaction.wait()

        setHasInspected(true)
    }

    useEffect(() => {
        fetchDetails()
        fetchOwner()
    }, [hasSold, account])

    return (
        <div className="home">
            <div className='home__details'>
                <div className='home__image'>
                    <img src={home.image} alt='Home' />
                </div>
                <div className='home__overview'>
                    <h1>{home.name}</h1>
                    <p>
                        <strong>{home.attributes[2].value} </strong>bds |
                        <strong>{home.attributes[3].value} </strong>ba |
                        <strong>{home.attributes[4].value} </strong>sqft |
                    </p>
                    <p>{home.address}</p>
                    <h2>{home.attributes[0].value} ETH</h2>

                    {owner ? (
                        <div className='home__owned'>
                            Owned by {owner.slice(0, 6) + '...' + owner.slice(38, 42)}
                        </div>
                    ) : (
                        <div>
                            {(account === inspector) ? (
                                <button className='home__buy' onClick={inspectHandler} disabled={hasInspected}>
                                    Approve Inspection
                                </button>
                            ) : (account === lender) ? (
                                <button className='home__buy' onClick={lendHandler} disabled={hasLent}>
                                    Approve & lend
                                </button>
                            ) : (account === seller) ? (
                                <button className='home__buy' onClick={sellHandler} disabled={hasSold}>
                                    Approve & sell
                                </button>
                            ) : (
                                <button className='home__buy' onClick={buyHandler} disabled={hasBought}>
                                    Approve & Buy
                                </button>
                            )}

                            <button className='home__contact'>
                                Contact Agent
                            </button>           
                        </div>
                    )}

                    <hr />

                    <h2>Overview</h2>
                    <p>{home.description}</p>

                    <hr />

                    <h2>Facts and Features</h2>
                    <ul>
                            <li><strong>{home.attributes[1].trait_type}</strong>: {home.attributes[1].value}</li>
                            <li><strong>{home.attributes[5].trait_type}</strong>: {home.attributes[5].value}</li>
                    </ul>
                </div>
                <button onClick={togglePop} className='home__close'>
                    <img src={close} alt='Close' />
                </button>
            </div> 
        </div>
    );
}

export default Home;
